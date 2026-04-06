const mongoose = require('mongoose');
const MonitorSchema = new mongoose.Schema({
    ownerKey: String,
    name: String,
    url: String,
    status: { type: String, default: "Checking..." },
    responseTime: String,
    lastChecked: String
});
module.exports = mongoose.model('Monitor', MonitorSchema);
