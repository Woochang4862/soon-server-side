const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/status', function (req, res) {
    if (req.isAuthenticated()) {
      res.json({
        'message': 'Authenticated Success',
        'username': req.user.username
      })
    } else {
      res.json({
        'message': 'Authenticated Failed',
        'error_message': function () {
          if (req.flash('signupMessage'))
            return req.flash('signupMessage')
          if (req.flash('loginMessage'))
            return req.flash('loginMessage')
        }
      })
    }
  });
  
  router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/api/status',
    failureRedirect: '/api/status',
    failureFlash: true
  }),
    function (req, res) {
      console.log("hello");
  
      if (req.body.remember) {
        req.session.cookie.maxAge = 1000 * 60 * 3;
      } else {
        req.session.cookie.expires = false;
      }
      res.redirect('/status');
    });
  
  router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/api/status',
    failureRedirect: '/api/status',
    failureFlash: true
  }));
  
  router.get('/logout', isLoggedIn, function (req, res) {
    req.logout();
    res.redirect('/status');
  });
  
  // route middleware to make sure
  function isLoggedIn(req, res, next) {
  
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
      return next();
  
    // if they aren't redirect them to the home page
    res.redirect('/status');
  }

  module.exports = router;