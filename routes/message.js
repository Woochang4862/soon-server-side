const express = require('express');
const router = express.Router();

router.get('/checking/server', (req, res)=>{
  res.status(503);
  res.json({
    message:'checking server'
  });
});

module.exports = router;
