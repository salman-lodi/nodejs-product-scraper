const express = require('express'),
  router = express.Router(),
  path = require('path'),
  axios = require('axios'),
  cheerio = require('cheerio'),
  app = express(),
  bodyParser = require('body-parser'),
  env = process.env,
  _ = require('lodash'),
  utils = require('../utils/common-util');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/scrape', utils.cache(), async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
      let response = await axios.get(req.body.url);
      let responseHtml = response.data;
      resObj = {},
          $ = cheerio.load(responseHtml),
          $title = $('head title').text(),
          $description = $('meta[property="og:description"]').attr('content'),
          $kwd = $('meta[name="keywords"]').attr('content'),
          $ogTitle = $('meta[property="og:title"]').attr('content'),
          $ogImage = $('meta[property="og:image"]').attr('content'),
          $ogkeywords = $('meta[property="og:keywords"]').attr('content'),
          $images = $('img');

      if ($ogTitle) {
          resObj['title'] = $ogTitle;
      } else {
          resObj['title'] = $title
      }

      if ($description) {
          resObj['description'] = $description;
      } else {
          let desc = '';
          $('ul.a-unordered-list li').each(function(i, el) {
              let description = $(el).find('span.a-list-item').text();
              desc = desc + ' ' + description
          });
          resObj['description'] = desc.replace(/(?:\r\n|\r|\n)/g, '');
      }


      if ($ogkeywords && $ogkeywords.length) {
          resObj['keywords'] = $ogkeywords;
      } else if ($kwd) {
          resObj['keywords'] = $kwd;
      }

      if ($ogImage && $ogImage.length) {
          resObj['images'] = $ogImage;
      } else {
          if ($images && $images.length) {
              resObj.images = [];
              let image;
              for (var i = 0; i < $images.length; i++) {
                  image = $($images[i]).attr('src')
                  if (image && _.startsWith(image, 'http')) {
                      resObj.images.push($($images[i]).attr('src'));
                  }
              }
          }
      }

      mcache.put(req.body.url, JSON.stringify(resObj), 15 * 1000); //cache for 15 seconds
      //send the response
      res.end(JSON.stringify(resObj));
  } catch (error) {
      console.log(error);
      res.end(JSON.stringify({
          error: 'There was an error of some kind'
      }));
  }
});

module.exports = router;
