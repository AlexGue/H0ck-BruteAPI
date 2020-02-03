var request = require('request');
var sha1 = require('crypto-js/sha1');
var utils = require('./utils')

var orchestratorHost = "https://orchestrator.h0ck.alexgd.es"

var responseBodies = {
}
var responseResult = {
}
var taskPromises = [];

async function createPromises(task) {
    var hash = Object.keys(task)[0];
    console.log(task)
    var tasks = task[hash].minitasks.pending;
    for (var tid in tasks) {

        var context = {
            variables: tasks[tid].variables,
            config: parseConfigWithVariables(task[hash].config, tasks[tid].variables)
        }
        await createPromiseForContext(context);

        //     if (i % 1000 == 0 ){
        //    console.log((parseInt(i)+1)  + "/" + variables["user"].length + " -> " + context.variables.user)
        //     }
    }
}



function parseConfigWithVariables(configObj, variables) {
    var config = utils.jsonCopy(configObj)
    for (var v in variables) {
        var reg = new RegExp("%%&&%%" + v + "%%&&%%", "gm");
        if (typeof config.body === "object") {
            var parsedString = JSON.stringify(config.body).replace(reg, variables[v]);
            config.body = JSON.parse(parsedString);

        } else {
            config.body = config.body.replace(reg, variables[v]);
        }
        config.url = config.url.replace(reg, variables[v]);
        parseMap(config.headers, v, variables[v])
        if (config.form) {
            parseMap(config.form, v, variables[v])
        }
    }
    return config;
}

function parseMap(map, variable, value) {
    var reg = new RegExp("%%&&%%" + variable + "%%&&%%", "gm");
    for (var hd in map) {
        if (hd.replace(reg, value) != hd) {
            map[hd.replace(reg, value)] = map[hd] ? map[hd].replace(reg, value) : "";
            delete map[hd];
        }
        else {
            map[hd] = map[hd] ? map[hd].replace(reg, value) : "";
        }
    }
}

async function createPromiseForContext(context) {
    var options = {
        url: context.config.url,
        headers: context.config.headers,
        method: context.config.method,
        body: context.config.body,
        timeout: 2000,
    };

    if (context.config.form) {
        options["form"] = context.config.form
        options.headers["Content-Length"] = context.config.form.length
    }


    var prom = new Promise(function (resolve, reject) {
        var ctx = context;
        request(options).on("error", function(e){
            console.log("ERROR: " + e);
            resolve({ ctx, e, response, body })
        }).on("response", function(response){
            var body = response.body;
            var error = null;
            resolve({ ctx, error, response, body })
        })
    });
    await prom;
    prom.then(processPromise)
    taskPromises.push(prom);
    console.log("number: " + taskPromises.length)
}


function processPromise({ ctx, error, response, body }) {

    if (!error) {
        var sha1body = sha1(body);
        var sha1headers = sha1(response.headers);
        var hashResponse = sha1body + sha1headers + response.statusCode;
        if (!responseResult[hashResponse]) {
            responseResult[hashResponse] = {
                numberOfRequests: 0,
                bodyHash: sha1body,
                headers: response.headers,
                variables: [],
                statusCode: response.statusCode
            }
            console.log("New response FOUND! Context -> " + JSON.stringify(ctx))

        }
        responseResult[hashResponse].numberOfRequests++;
        responseResult[hashResponse].variables.push(ctx.variables)
        if (!responseBodies[sha1body]) {
            responseBodies[sha1body] = body;
        }

    }
    else {
        console.log("Se ha detectado un error en la peticion")
        console.log(error.message)
    }

}

async function checkTasks() {
    console.log("Getting new tasks from Orquestator")
    request.post({ url: orchestratorHost + "/tasks/obtain/bruteapi/" }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("GOT NEW TASKS")
            var body = JSON.parse(body);
            createPromises(body).then(x => {
                console.log("PROCESSING TASKS")
                Promise.all(taskPromises).then(x => {
                    console.log("FINISHED: " + JSON.stringify(responseResult));
                    var bodySolve = {}
                    bodySolve[Object.keys(body)[0]] = {
                        minitasks: {
                            pending: {},
                            progress: {},
                            finished: body[Object.keys(body)[0]].minitasks.pending,
                        },
                        resolution: responseResult
                    }
                    responseBodies = {}
                    responseResult = {}
                    taskPromises = [];
                    console.log("Tasks finished...")
                    request.post({
                        url: orchestratorHost + "/tasks/solve/bruteapi/",
                        body: bodySolve,
                        json: true
                    }, function(error, response, body){
                        if (error){
                            console.log("ERROR5:" + error)
                        }
                        console.log("Data Sent")
                        utils.sleep(2000);
                        console.log("CHECKING TASKS")
                        checkTasks();
                    })
                    
                   
                });
            });
        }
        else {
            console.log("ERROR3: " + error)
            utils.sleep(10000);
            checkTasks();
        }
    })
}

checkTasks();






