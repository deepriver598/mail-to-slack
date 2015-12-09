console.log('Loading function');

// Packages
var Aws = require('aws-sdk');
var Slack = require('node-slack');
var MailParser = require('mailparser').MailParser;
var Fs = require('fs');

// Params
var json = Fs.readFileSync("./property.json", "utf-8");
var property = JSON.parse(json);
var line = '----------------------------------\n';

// Handler
exports.handler = function(event, context) {
  var s3 = new Aws.S3();

  // Get the bucket and object name from the event
  var bucket = event.Records[0].s3.bucket.name;
  var key = event.Records[0].s3.object.key;
  var params = {
    Bucket: bucket,
    Key: key
  };

  // Get MailData from S3
  var mailparser = new MailParser();
  s3.getObject(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      context.fail();
    } else {
      mailparser.on("end", function(mailStr){
        // check from-address
        switch (mailStr.from[0].address) {
          // from zabbix
          case property.zabbix.address:
            // Push to Slack
            pushToSlack(
              property.zabbix.hookUrl,
              property.zabbix.channel,
              property.zabbix.username,
              line + mailStr.text
            )
            break;
          // from cloudwatch
          case property.cloudwatch.address:
            // Push to Slack
            pushToSlack(
              property.cloudwatch.hookUrl,
              property.cloudwatch.channel,
              property.cloudwatch.username,
              line + mailStr.text
            )
            break;
          default:
            console.log('from-address is unknown. process exit.');
            context.succeed();
            break;
        }
      });
      mailparser.write(data.Body.toString());
      mailparser.end();
    }
  });

  /* function  : push message to specified slack channel
   ** url      : slack incoming-webhook url
   ** channel  : slack channel
   ** username : slack post user
   ** text     : message body
  */
  function pushToSlack(url, channel, username, text) {
    // Push to Slack
    var slack = new Slack(url);
    slack.send({
      text: text,
      channel: channel,
      username: username
    },function(){
      context.succeed();
    });
  }
};
