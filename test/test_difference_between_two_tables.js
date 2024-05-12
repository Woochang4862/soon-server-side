function getDiff(a1, a2) {
    var _arrToDelete = [], arrToAdd = [];

    for (var i = 0; i < a1.length; i++) {
        _arrToDelete[a1[i]] = a1[i];
    }

    for (var i = 0; i < a2.length; i++) {
        if (_arrToDelete[a2[i]] != undefined) {
            delete _arrToDelete[a2[i]];
        } else {
            arrToAdd.push(a2[i]);
        }
    }

    var arrToDelete = [];
    for (var id of _arrToDelete) {
        if (id)
            arrToDelete.push(id);
    }

    return { arrToDelete, arrToAdd };
}

var array_from_api = [...Array(10000000).keys()];
var array_from_table = [...Array(0).keys()];
const diff = getDiff(array_from_table, array_from_api)
//console.log(diff);
console.log(diff.arrToDelete.length, diff.arrToAdd.length);
