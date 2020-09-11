const express = require('express'),
    path = require('path'),
    axios = require('axios'),
    cheerio = require('cheerio'),
    app = express(),
    bodyParser = require('body-parser'),
    env = process.env,
    _ = require('lodash'),
    mcache = require('memory-cache');
    
var cache = () => {
    return (req, res, next) => {
        let key = '__express__' + req.originalUrl || req.url
        let cachedBody = mcache.get(key)
        if (cachedBody) {
            res.send(cachedBody)
            return
        }
        next()
    }
};

//support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
    extended: true
}));

//serve www folder as static pages
app.use(express.static(path.join(__dirname, 'www')));

app.post('/scrape', cache(), async (req, res) => {
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

        mcache.put('__express__' + req.originalUrl || req.url, JSON.stringify(resObj), 15 * 1000); //cache for 15 seconds
        //send the response
        res.end(JSON.stringify(resObj));
    } catch (error) {
        console.log(error);
        res.end(JSON.stringify({
            error: 'There was an error of some kind'
        }));
    }
});

//listen for an HTTP request
app.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost');

//just so we know the server is running
console.log('Server listening on: http://localhost:3000');