const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Grievance = require('../models/Grievance');
const User = require('../models/User');

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

/**
 * @route   POST /api/grievances
 * @desc    Create a new grievance
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, category, aiPriority, summary, submitterUserId, submitterName, location, citizenPhoto } = req.body;

    // Input validation
    if (!title || !description || !submitterUserId) {
      return res.status(400).json({ error: 'Title, description, and submitterUserId are required' });
    }

    if (title.length < 5 || title.length > 200) {
      return res.status(400).json({ error: 'Title must be 5-200 characters' });
    }

    if (description.length < 10 || description.length > 2000) {
      return res.status(400).json({ error: 'Description must be 10-2000 characters' });
    }

    let citizenPhotoUrl = '';
    if (citizenPhoto) {
      citizenPhotoUrl = saveBase64Image(citizenPhoto);
    }

    let resolvedSubmitterName = submitterName || 'Anonymous';
    if (submitterUserId && mongoose.Types.ObjectId.isValid(submitterUserId)) {
      const user = await User.findById(submitterUserId).select('firstName lastName').lean();
      if (user) {
        resolvedSubmitterName = `${user.firstName} ${user.lastName}`;
      }
    }

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

    const savedGrievance = await newGrievance.save();
    res.status(201).json(savedGrievance);
  } catch (err) {
    console.error('Error creating grievance:', err);
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
