var bodyParser = require('body-parser');
var logger = require('./lib/logger');

var path = require('path');

var mockup = {
    options: {
        // 模拟数据根目录
        root: path.resolve(__dirname, 'mockup'),
        // 需要拦截的请求规则，如: ['/api/*', '/v2/*']
        prefix: []
    }
};

mockup.load = function (request, type) {
    var requestPath = request.path;
    var pathSegments = requestPath.split(/\//);
    var notEmptySegments = [];
    pathSegments.forEach(function (item) {
        item && notEmptySegments.push(item);
    });

    if (notEmptySegments.length > 0) {
        var filePath = notEmptySegments.join('/');
        try {
            var mockModuleName = path.resolve(mockup.options.root, filePath);
            logger.info('[FILE]', 'Try Load', mockModuleName);
            // 每次都重新获取
            delete require.cache[require.resolve(mockModuleName)];
            return require(mockModuleName);
        }
        catch (e) {
            logger.error('[ERROR]', request.path, e.toString());
            return null;
        }
    }
    else {
        return null;
    }
};

mockup.setup = function(options) {
    for (var key in options) {
        if (options.hasOwnProperty(key)) {
            mockup.options[key] = options[key];
        }
    }
    return function (app) {
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({extended: true}));
        for (var i = 0; i < mockup.options.prefix.length; i++) {
            var prefix = mockup.options.prefix[i];
            app.all(prefix, function (req, res) {
               var reqHandler = mockup.load(req);
                if (!reqHandler) {
                    res.status(404).end("404");
                    return;
                }
                logger.ok('[OK]', 'Mock Request', req.path);
                res.json(reqHandler.response(req.path, req.method === 'GET' ? req.query : req.body));
            });
        }
    };
};

/**
 * 返回普通成功mockup请求
 *
 * @param {Object} result 返回的结果数据
 */
mockup.ok = function (result) {
    return {
        success: true,
        data: result || {}
    };
};

/**
 * 返回列表类型成功mockup请求
 *
 * @param {Object} result 返回的结果数据
 * @param {Object} page 返回分页数据的元数据
 */
mockup.list = function (result, page) {
    page = page || {};

    var response = {
        success: true,
        data: {
            page: {
                totalCount: page.totalCount || 100,
                pageNo: page.pageNo || 1,
                pageSize: page.pageSize || 15,
                orderBy: page.orderBy || 'id',
                order: page.order || 'desc',
            },
            list: result || []
        }
    };
    return response;
};

/**
 * 返回普通失败mockup请求
 *
 * @param {Object} msg 失败信息
 */
mockup.fail = function (msg) {
    return {
        success: false,
        message: msg
    };
};

module.exports = mockup;

