tconf = require("turbot-config");
winston = require("winston");

const turbotRewriter = function(level, msg, meta) {
  let correlationId = tconf.get(["trace", "correlationId"]);
  // Should not happen, but if no correlationId is given for the request then
  // we have no choice but to continue. It's not like we can log here!
  if (!correlationId) {
    return meta;
  }
  // Enrich the log data
  if (!meta.turbot) {
    meta.turbot = {};
  }
  meta.turbot.correlationId = correlationId;
  return meta;
};

const winstonTransportSettings = {
  // Turbot uses syslog levels
  levels: winston.config.syslog.levels,
  // Set the log level for all transports
  level: tconf.get(["log", "level"], process.env.LOG_LEVEL || "info"),
  // Errors should be handled elsewhere, not by the log process
  exitOnError: true,
  rewriters: [turbotRewriter],
  // Use console transport, which is great for both Lambda functions and docker
  // containers - generally where Turbot is run.
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      json: true,
      stringify: tconf.get(["turbot", "environment"], process.env.NODE_ENV) == "production",
      timestamp: true
    })
  ]
};

const logger = new winston.Logger(winstonTransportSettings);

module.exports = logger;
