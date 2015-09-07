var extend = require("matchbox-util/extend")
var object = require("matchbox-util/object")

var constructors = new Set()

module.exports = function internals(Class) {
  var prototype = Class.prototype
  var parents = Class.parents = []
  var setups = Class.setups = []
  var statics = Class.statics = new Map()

  object.defineGetter(Class, "statics", statics)
  object.defineGetter(Class, "setups", setups)
  object.defineGetter(Class, "parents", parents)

  constructors.add(Class)

  /**
   * For setting up static functions, specially functions that access a closure.
   * It's useful when inheriting from a class where a static function is accessing a closure.
   * This way those closures are always re-defined for the super class, when calling the  provided setup function.
   * */
  Class.setup = function (fn, Base) {
    fn(Class, Base)
    setups.push(fn)
    return Class
  }

  /**
   * For defining static functions that doesn't need a closure.
   * */
  Class.static = function (name, fn) {
    statics.set(name, fn)
    return Class
  }

  Class.extend = function (Super) {
    internals(Super)
    Super.inherit(Class)
    return Super
  }

  Class.inherit = function (Base) {
    prototype = Class.prototype = Object.create(Base.prototype)
    Class.prototype.constructor = Class

    if (constructors.has(Base)) {
      Base.parents.forEach(function (parent) { parents.push(parent) })
      Base.setups.forEach(function (setup) { setups.push(setup) })
      Base.statics.forEach(function (name, fn) { Class.static(name, fn) })
      setups.forEach(function (setup) {
        Class.setup(setup, Base)
      })
    }

    parents.push(Base)
    Class.onCreate(Base)

    return Class
  }

  Class.include = function (Other) {
    function include( Other ){
      Class.proto(Other.prototype)
      Class.onCreate(Other)
    }
    if( Array.isArray(Other) ){
      Other.forEach(include)
    }
    else {
      include(Other)
    }
    return Class
  }

  Class.augment = function (extensions) {
    function augment(extension) {
      if (typeof extension == "function") {
        extension.call(Class.prototype, Class)
      }
      else {
        Class.proto(extension)
      }
    }
    if (Array.isArray(extensions)) {
      extensions.forEach(augment)
    }
    else {
      augment(extensions)
    }
    return Class
  }

  Class.onCreate = function (constructor) {
    if (typeof constructor == "function") {
      parents.push(constructor)
    }
    return Class
  }

  Class.create = function (instance, args) {
    parents.forEach(function (constructor) {
      constructor.apply(instance, args)
    })
    return instance
  }

  Class.method = function (name, fn) {
    object.method(prototype, name, fn)
    return Class
  }

  Class.property = function (name, fn) {
    object.property(prototype, name, fn)
    return Class
  }

  Class.get = function (name, fn) {
    object.defineGetter(prototype, name, fn)
    return Class
  }

  Class.set = function (name, fn) {
    object.defineSetter(prototype, name, fn)
    return Class
  }

  Class.accessor = function (name, get, set) {
    object.accessor(prototype, name, get, set)
    return Class
  }

  Class.proto = function (prototype) {
    for (var prop in prototype) {
      if (prototype.hasOwnProperty(prop)) {
        if (typeof prototype[prop] == "function") {
          if (prop === "onCreate") {
            Class.onCreate(prototype[prop])
          }
          else {
            Class.method(prop, prototype[prop])
          }
        }
        else {
          Class.property(prop, prototype[prop])
        }
      }
    }
    return Class
  }

  return Class
}
