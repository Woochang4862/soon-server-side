import express from 'express';
const router = express.Router();

router.get('/checking/server', (req, res)=>{
  res.status(200);
  res.json({
    message:'Server is alive!'
  });
});

export default router;
