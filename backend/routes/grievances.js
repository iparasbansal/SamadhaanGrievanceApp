const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Grievance = require('../models/Grievance');
const User = require('../models/User');
const { log, logFile } = require('../logger');

const ALL_CATEGORIES = [
  'Roads & Infrastructure',
  'Water Supply',
  'Electricity',
  'Waste Management',
  'Public Safety',
  'Emergency Services',
  'Other',
];

const CATEGORY_ALIASES = {
  Roads: 'Roads & Infrastructure',
  Infrastructure: 'Roads & Infrastructure',
  Water: 'Water Supply',
  Power: 'Electricity',
  Waste: 'Waste Management',
  Sanitation: 'Waste Management',
  Garbage: 'Waste Management',
  Safety: 'Public Safety',
  Emergency: 'Emergency Services',
  'Fire Department': 'Emergency Services',
};

function normalizeCategory(category) {
  const mapped = CATEGORY_ALIASES[category] || category;
  return ALL_CATEGORIES.includes(mapped) ? mapped : 'Other';
}

const fs = require('fs');
const path = require('path');

function saveBase64Image(base64Str) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  try {
    const parts = base64Str.split(';');
    const mimeType = parts[0]?.split(':')[1] || '';
    const ext = mimeType.split('/')[1] || 'jpg';
    const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const fileName = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error('Failed to save base64 image to disk:', err);
    return base64Str;
  }
}

async function attachUser(req, res, next) {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !process.env.JWT_SECRET) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.authUser = await User.findById(decoded.id).select('-password').lean();
    if (!req.authUser) {
      return res.status(401).json({ error: 'Invalid user session' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  next();
}

function getDepartmentScopedQuery(user) {
  if (!user || user.role !== 'authority') return {};
  return { category: normalizeCategory(user.departmentId) };
}

function canDepartmentAccess(user, grievance) {
  if (!user || user.role !== 'authority') return true;
  return normalizeCategory(grievance.category) === normalizeCategory(user.departmentId);
}

/**
 * @route   GET /api/grievances
 * @desc    Get all grievances with pagination
 * @query   page=1, limit=10
 * @access  Public
 */
router.get('/', attachUser, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const query = getDepartmentScopedQuery(req.authUser);
    if (req.query.submitterUserId) {
      query.submitterUserId = req.query.submitterUserId;
    }

    const grievances = await Grievance.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Dynamically resolve submitter names from User collection
    const userIds = [...new Set(grievances.map(g => g.submitterUserId).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName').lean();
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = `${u.firstName} ${u.lastName}`;
    });

    const enrichedGrievances = grievances.map(g => {
      const resolvedName = g.submitterUserId ? userMap[g.submitterUserId.toString()] : null;
      return {
        ...g,
        submitterName: resolvedName || g.submitterName || 'Anonymous Citizen'
      };
    });

    const total = await Grievance.countDocuments(query);

    res.json({
      data: enrichedGrievances,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching grievances:', err);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});
router.get('/crash-log', (req, res) => {
  const fs = require('fs');
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf8');
    res.type('text/plain').send(content);
  } else {
    res.send('No crash log found.');
  }
});

router.get('/clear-log', (req, res) => {
  const fs = require('fs');
  try {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
      res.send('Log cleared.');
    } else {
      res.send('No log file to clear.');
    }
  } catch (err) {
    res.status(500).send(`Failed to clear log: ${err.message}`);
  }
});

router.get('/test-debug', async (req, res) => {
  log('Starting /test-debug request');
  try {
    log('Creating test Grievance object...');
    const newGrievance = new Grievance({
      title: 'Test Title Debug',
      description: 'Test description debug that is long enough.',
      category: 'Other',
      aiPriority: 'Low',
      summary: 'Test summary',
      submitterUserId: '6a3cd505bb205dfb9b97b11f',
      submitterName: 'Test Debugger',
      location: {
        address: 'Test Spot',
        latitude: 30.24,
        longitude: 75.84
      }
    });
    log('Grievance object created. Saving...');
    const saved = await newGrievance.save();
    log('Grievance saved successfully!');
    return res.json({ success: true, saved });
  } catch (err) {
    log(`Error caught in /test-debug: ${err.message}\nStack: ${err.stack}`);
    return res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * @route   POST /api/grievances/check-duplicates
 * @desc    Check for potential duplicate grievances nearby
 * @access  Public
 */
router.post('/check-duplicates', async (req, res) => {
  try {
    const { category, latitude, longitude, title } = req.body;
    if (!latitude || !longitude || !category) {
      return res.status(400).json({ error: 'category, latitude, and longitude are required' });
    }

    // Fetch all unresolved complaints of the same category
    const grievances = await Grievance.find({
      category: normalizeCategory(category),
      status: { $in: ['Submitted', 'In Progress'] }
    }).lean();

    const duplicates = [];
    const keywords = (title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);

    for (const g of grievances) {
      if (!g.location || !g.location.latitude || !g.location.longitude) continue;
      
      const dist = getDistanceKm(
        latitude,
        longitude,
        g.location.latitude,
        g.location.longitude
      );

      // Within 1.5 km
      if (dist <= 1.5) {
        let titleMatch = false;
        if (keywords.length > 0) {
          const gTitleLower = g.title.toLowerCase();
          titleMatch = keywords.some(keyword => gTitleLower.includes(keyword));
        }

        // Match if keywords overlap OR if they are super close (within 300m) regardless of title
        if (titleMatch || dist <= 0.3) {
          duplicates.push({
            id: g._id,
            title: g.title,
            status: g.status,
            distanceKm: parseFloat(dist.toFixed(2)),
            address: g.location.address,
            upvotes: g.upvotes
          });
        }
      }
    }

    // Sort by proximity
    duplicates.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ duplicates });
  } catch (err) {
    console.error('Error checking duplicates:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/grievances
 * @desc    Create a new grievance
 * @access  Public
 */
router.post('/', async (req, res) => {
  log(`POST /api/grievances request received. Body keys: ${Object.keys(req.body || {}).join(', ')}`);
  try {
    const { title, description, category, aiPriority, summary, submitterUserId, submitterName, location, citizenPhoto } = req.body;

    // Input validation
    if (!title || !description || !submitterUserId) {
      log('Validation failed: missing title, description, or submitterUserId');
      return res.status(400).json({ error: 'Title, description, and submitterUserId are required' });
    }

    if (!citizenPhoto) {
      log('Validation failed: missing citizenPhoto');
      return res.status(400).json({ error: 'Upload of a proof photo is compulsory to submit a grievance' });
    }

    if (title.length < 5 || title.length > 200) {
      log(`Validation failed: title length ${title.length}`);
      return res.status(400).json({ error: 'Title must be 5-200 characters' });
    }

    if (description.length < 10 || description.length > 2000) {
      log(`Validation failed: description length ${description.length}`);
      return res.status(400).json({ error: 'Description must be 10-2000 characters' });
    }

    log('Validations passed. Processing photo if present...');
    let citizenPhotoUrl = '';
    if (citizenPhoto) {
      log('Processing citizenPhoto...');
      citizenPhotoUrl = saveBase64Image(citizenPhoto);
      log(`Processed citizenPhoto. Url: ${citizenPhotoUrl}`);
    }

    let resolvedSubmitterName = submitterName || 'Anonymous';
    if (submitterUserId && mongoose.Types.ObjectId.isValid(submitterUserId)) {
      log(`Resolving submitterName for userId: ${submitterUserId}`);
      const user = await User.findById(submitterUserId).select('firstName lastName').lean();
      if (user) {
        resolvedSubmitterName = `${user.firstName} ${user.lastName}`;
        log(`Resolved name: ${resolvedSubmitterName}`);
      } else {
        log('User not found by id.');
      }
    }

    log('Creating new Grievance Mongoose model instance...');
    const newGrievance = new Grievance({
      title: title.trim(),
      description: description.trim(),
      category: normalizeCategory(category || 'Other'),
      aiPriority: aiPriority || 'Low',
      summary: summary || '',
      submitterUserId,
      submitterName: resolvedSubmitterName,
      location,
      citizenPhoto: citizenPhotoUrl ? { url: citizenPhotoUrl, uploadedAt: new Date() } : undefined
    });

    log('Grievance instance created. Saving to MongoDB...');
    const savedGrievance = await newGrievance.save();
    log('Grievance saved successfully to MongoDB.');
    res.status(201).json(savedGrievance);
  } catch (err) {
    log(`Error caught in POST /: ${err.message}\nStack: ${err.stack}`);
    res.status(500).json({ error: 'Failed to create grievance' });
  }
});

/**
 * @route   GET /api/grievances/:id
 * @desc    Get a specific grievance
 * @access  Public
 */
router.get('/:id', attachUser, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id).lean();
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    if (!canDepartmentAccess(req.authUser, grievance)) {
      return res.status(403).json({ error: 'This grievance belongs to another department' });
    }

    // Enrich with submitterName
    if (grievance.submitterUserId && mongoose.Types.ObjectId.isValid(grievance.submitterUserId)) {
      const user = await User.findById(grievance.submitterUserId).select('firstName lastName').lean();
      if (user) {
        grievance.submitterName = `${user.firstName} ${user.lastName}`;
      }
    }

    res.json(grievance);
  } catch (err) {
    console.error('Error fetching grievance:', err);
    res.status(500).json({ error: 'Failed to fetch grievance' });
  }
});

/**
 * @route   PUT /api/grievances/:id
 * @desc    Update a grievance
 * @access  Private (requires token)
 */
router.put('/:id', attachUser, async (req, res) => {
  try {
    const { title, description, category, status, aiPriority, upvotes, upvotedBy } = req.body;

    // Input validation
    if (title && (title.length < 5 || title.length > 200)) {
      return res.status(400).json({ error: 'Title must be 5-200 characters' });
    }

    const updates = {};
    if (title) updates.title = title.trim();
    if (description) updates.description = description.trim();
    if (category) updates.category = normalizeCategory(category);
    if (aiPriority) updates.aiPriority = aiPriority;
    if (typeof upvotes === 'number') updates.upvotes = upvotes;
    if (Array.isArray(upvotedBy)) updates.upvotedBy = upvotedBy;

    const existingGrievance = await Grievance.findById(req.params.id);
    if (!existingGrievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (!canDepartmentAccess(req.authUser, existingGrievance)) {
      return res.status(403).json({ error: 'This grievance belongs to another department' });
    }

    if (req.body.resolutionPhoto) {
      const photo =
        typeof req.body.resolutionPhoto === 'string'
          ? { url: req.body.resolutionPhoto }
          : req.body.resolutionPhoto;

      if (!photo || typeof photo.url !== 'string') {
        return res.status(400).json({ error: 'Resolution photo must be an uploaded image' });
      }

      let savedUrl = photo.url;
      if (photo.url.startsWith('data:image/')) {
        savedUrl = saveBase64Image(photo.url);
      } else if (!photo.url.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'Resolution photo must be an uploaded image' });
      }

      updates.resolutionPhoto = {
        url: savedUrl,
        name: photo.name || 'resolution-photo',
        uploadedBy: photo.uploadedBy || '',
        uploadedAt: new Date(),
      };
    }

    if (status) {
      if (
        status === 'Resolved' &&
        !updates.resolutionPhoto?.url &&
        !existingGrievance.resolutionPhoto?.url
      ) {
        return res.status(400).json({
          error: 'A solved photo is required before marking this grievance as Resolved',
        });
      }
      updates.status = status;
    }

    const grievance = await Grievance.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const grievanceObj = grievance.toObject ? grievance.toObject() : grievance;
    if (grievanceObj.submitterUserId && mongoose.Types.ObjectId.isValid(grievanceObj.submitterUserId)) {
      const user = await User.findById(grievanceObj.submitterUserId).select('firstName lastName').lean();
      if (user) {
        grievanceObj.submitterName = `${user.firstName} ${user.lastName}`;
      }
    }

    res.json(grievanceObj);
  } catch (err) {
    console.error('Error updating grievance:', err);
    res.status(500).json({ error: 'Failed to update grievance' });
  }
});

/**
 * @route   DELETE /api/grievances/:id
 * @desc    Delete a grievance
 * @access  Private (requires token)
 */
router.delete('/:id', attachUser, async (req, res) => {
  try {
    const existingGrievance = await Grievance.findById(req.params.id);

    if (!existingGrievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (!canDepartmentAccess(req.authUser, existingGrievance)) {
      return res.status(403).json({ error: 'This grievance belongs to another department' });
    }

    await Grievance.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Grievance deleted successfully' });
  } catch (err) {
    console.error('Error deleting grievance:', err);
    res.status(500).json({ error: 'Failed to delete grievance' });
  }
});

/**
 * @route   POST /api/grievances/:id/upvote
 * @desc    Upvote a grievance
 * @access  Public
 */
router.post('/:id/upvote', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (!grievance.upvotedBy) grievance.upvotedBy = [];

    if (grievance.upvotedBy.includes(userId)) {
      return res.status(400).json({ error: 'Already upvoted' });
    }

    grievance.upvotes = (grievance.upvotes || 0) + 1;
    grievance.upvotedBy.push(userId);

    await grievance.save();
    res.json(grievance);
  } catch (err) {
    console.error('Error upvoting grievance:', err);
    res.status(500).json({ error: 'Failed to upvote grievance' });
  }
});

module.exports = router;
