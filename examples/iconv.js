/**
 * Tips
 * ====
 * - Set `user-agent` and `accept` headers when sending requests. Some services will not respond as expected without them.
 * - Set `pool` to false if you send lots of requests using "request" library.
 */

var es = require('event-stream')
  , request = require('request')
  , FeedParser = require(__dirname+'/..')
  , Iconv = require('iconv').Iconv;

function fetch(feed) {
  var req = request(feed, {timeout: 10000, pool: false})
    , iconv;

  req.setMaxListeners(50);

  req
    // Some feeds do not response without user-agent and accept headers.
    .setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36')
    .setHeader('accept', 'text/html,application/xhtml+xml')
    .on('error', done)
    .on('response', function(res) {
        var charset;

        if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));

        charset = getParams(res.headers['content-type'] || '').charset;

        // Use iconv if its not utf8 already.
        if (!iconv && charset && !/utf-*8/i.test(charset)) {
          try {
            iconv = new Iconv(charset, 'utf-8');
          } catch(err) {
            this.emit('error', err);
          }
        }
    })
    .pipe(es.through(function(data) {
      if (iconv) {
        try {
          data = iconv.convert(data);
        } catch(err) {
          this.emit('error', err);
        }
      }
      this.emit('data', data);
    }))
    .on('error', done)
    .pipe(new FeedParser())
      .on('error', done)
      .on('readable', function() {
        var post;
        while (post = this.read()) {
          console.log(post);
        }
      })
      .on('end', done);
}

function getParams(str) {
  var params = str.split(';').reduce(function (params, param) {
        var parts = param.split('=').map(function (part) { return part.trim(); });
        if (parts.length === 2) {
          params[parts[0]] = parts[1];
        }
        return params;
      }, {});
  return params;
}

function done(err) {
  if (err) {
    console.log(err, err.stack);
    return process.exit(1);
  }
  server.close();
  process.exit();
}

// Don't worry about this. It's just a localhost file server so you can be
// certain the "remote" feed is available when you run this example.
var server = require('http').createServer(function (req, res) {
  var stream = require('fs').createReadStream('../test/feeds' + req.url);
  res.setHeader('Content-Type', 'text/xml; charset=Windows-1251');
  stream.pipe(res);
});
server.listen(function () {
  fetch('http://localhost:' + this.address().port + '/iconv.xml');
});
