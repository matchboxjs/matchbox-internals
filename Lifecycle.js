var object = require("matchbox-util/object")

module.exports = Lifecycle

function Lifecycle () {
  this.callbacks = {}
  this.currentState = null
}

Lifecycle.prototype.state = function (name) {
  var lifecycle = this
  var state = lifecycle.callbacks[name]

  if (!Array.isArray(state)) {
    state = lifecycle.callbacks[name] = []
    this[name] = function changeLifeCycleState (instance, args) {
      lifecycle.currentState = name
      state.forEach(function (callback) {
        callback.apply(instance, args)
      })
    }
  }

  return state
}
Lifecycle.prototype.inherit = function (lc) {
  var lifecycle = this
  object.in(lc.callbacks, function (name, state) {
    var l = state.length
    while (l--) {
      lifecycle.state(name).unshift(state[l])
    }
  })
}
Lifecycle.prototype.when = function (name, callback) {
  var state = this.state(name)
  if (typeof callback == "function" && !~state.indexOf(callback)) {
    state.push(callback)
  }
}
