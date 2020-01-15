module.exports.sleep = sleep;
module.exports.jsonCopy = jsonCopy;

function sleep(milliseconds)  {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}


function jsonCopy(src) {
    return JSON.parse(JSON.stringify(src));
}