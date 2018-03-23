# turbot-log

Logs in Turbot are expected to be:
* JSON format
* Written to stdout

For both Docker and AWS Lambda this is fairly easy to achieve since console.log
from node.js will end up feeding log entries. We can use a tool like Winston to
produce JSON log entries while limiting them to the correct log level.

In Turbot v0 to v4, we also push many log messages to Redis - providing a real
time view of processes in the UI. This is great, but obviously fairly heavy for
logging and will not work well in a more distributed application architecture.

For v5, our plan is to:
1. Log using Winston.
2. Use the console.log transport.
3. Route the output to AWS CloudWatch Logs.
4. Subscribe events from CloudWatch Logs to Kinesis streams.
5. Use Lambda to process log events.

(Note - GovCloud does not seem to support CloudWatch Logs subscriptions, so we
cannot automatically route data to a Kinesis stream. Instead, we'll add a
node.js stream transport to Winston and combine it with a library that presents
Kinesis streams as node.js streams.)

We'll also be using this mechanism to collect metrics and outcomes. This is
very fast, reduces complexity of code and provides the structured data we
require in a simple way. Imagine log entries for:
* Logging
* Metric data
* Resources to create
* Notifications to send



Why Winston?
It's slow - 
But powerful, and probably better than Bunyan - https://npmcompare.com/compare/bunyan,winston


