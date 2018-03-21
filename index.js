const tconf = require("turbot-config");
const utils = require("turbot-utils");
const winston = require("winston");
const format = winston.format;

const trace = format(function(info, opts) {
  let trace = tconf.get("trace");
  if (trace) {
    info.trace = trace;
  }
  return info;
});

const sanitize = format(function(info, opts) {
  return utils.data.sanitize(info, { clone: false });
});

const logger = winston.createLogger({
  // Turbot uses syslog levels
  levels: winston.config.syslog.levels,
  // Set the log level for all transports
  level: tconf.get(["log", "level"], process.env.LOG_LEVEL || "info"),
  // Errors should be handled elsewhere, not by the log process
  exitOnError: false,
  // Formatting specific to Turbot requirements
  format: format.combine(
    // Add Turbot trace information to all entries
    trace(),
    // Hide sensitive data by default
    sanitize(),
    // Add a timestamp to all entries
    format.timestamp(),
    // Log as JSON
    format.json()
  ),
  transports: [
    // Use console transport, which is great for both Lambda functions and docker
    // containers - generally where Turbot is run.
    new winston.transports.Console({ handleExceptions: true })
  ]
});

module.exports = logger;
