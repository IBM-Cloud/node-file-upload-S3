var express = require("express"),
    app = express(),
    cfenv = require("cfenv"),
    skipper = require("skipper"),
    skipperS3 = require('skipper-s3'),
    extend = require('extend'),
    S3Lister = require("s3-lister");

//load Object Storage (S3) credentials
var s3config = null
try {
  s3config = require("./s3-credentials.json");
}
catch (e) {}

var appEnv = cfenv.getAppEnv();

app.use(express.static(__dirname + "/public"));
app.use(skipper());


//fetch a single document from S3 storage
app.get("/files/:filename", function (request, response) {
    console.log(request.params.filename)
    var adapter = skipperS3(s3config);
    var readStream = adapter.read(request.params.filename);
    readStream.pipe(response);
});


//list documents from S3 storage
app.get("/files", function (request, response) {
    var adapter = skipperS3(s3config);

    adapter.ls("/", function (error, files) {
        if (error) {
            console.log(error);
            response.send(error);
        }
        else {
            response.send(files);
        }
    });
});


//upload a document to S3 storage
app.post("/upload", function (request, response) {
    
    var file = request.file('file');
    var filename = file._files[0].stream.filename;
    var options = extend({}, s3config, {
        adapter: skipperS3,
        headers: {
            'x-amz-acl': 'private'
        },
        saveAs: filename
    });

    file.upload(options, function (err, uploadedFiles) {
        if (err) {
            console.log(err);
            return response.send(err);
        }
        else {
            return response.redirect("/");
        }
    });
});



// BEGIN monkey-patch to override default maxKeys value in S3Lister
// if you do not set the default maxKeys value, you will get "400 Bad Request" errors from S3 when listing contents
S3Lister.prototype.__read = S3Lister.prototype._read;
S3Lister.prototype._read = function () { 
    this.options.maxKeys = 1000;
    S3Lister.prototype.__read.apply(this, arguments);
}
// END monkey-patch




//start the app
var port = process.env.PORT || 8080;
app.listen(port, function() {
    console.log('listening on port', port);
});


require("cf-deployment-tracker-client").track();
