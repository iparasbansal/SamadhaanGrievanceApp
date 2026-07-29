// 🌐 React Core
import React, { useState, useEffect } from "react";

// 💫 Animation
import { motion } from "framer-motion";

const TypingText = ({
    texts = [],
    typingSpeed = 120, 
    deletingSpeed = 80, 
    pauseTime = 1200, 
    className = ''
  }) => {
    const [text, setText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [index, setIndex] = useState(0);

    useEffect(() => {
      let interval;
      
      const current = texts[index % texts.length];
      
      if (!isDeleting) {
        // typing forward
        interval = setInterval(() => {
          setText((prev) => {
            const next = current.slice(0, prev.length + 1);
            if (next === current) {
              clearInterval(interval);
              setTimeout(() => setIsDeleting(true), pauseTime);
            }
            return next;
          });
        }, typingSpeed);
      } else {
        // deleting backward
        interval = setInterval(() => {
          setText((prev) => {
            const next = prev.slice(0, -1);
            if (next === '') {
              clearInterval(interval);
              setIsDeleting(false);
              setIndex((prevIndex) => (prevIndex + 1) % texts.length);
            }
            return next;
          });
        }, deletingSpeed);
      }
      
      return () => clearInterval(interval);
    }, [isDeleting, index, texts, typingSpeed, deletingSpeed, pauseTime]);
    
    return (
      <motion.span
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`whitespace-pre ${className}`}
      >
        {text}
        <span className="text-cyan-400 animate-pulse">|</span>
      </motion.span>
    );
  };

  export default TypingText;
