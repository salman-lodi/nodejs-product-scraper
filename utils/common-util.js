mcache = require('memory-cache');

var cache = () => {
    return (req, res, next) => {
        let key = req.body.url
        let cachedBody = mcache.get(key)
        if (cachedBody) {
            res.send(cachedBody)
            return
        }
        next()
    }
};

module.exports = {cache: cache};