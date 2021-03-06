var object = require("matchbox-util/object")

var constructors = []
var statics = []
var setups = []
var inclusions = []
var augmentations = []

function getRegistryItem (Class, registry) {
  var i = constructors.indexOf(Class)
  return registry[i]
}
function setRegistryItem (Class, registry, item) {
  var i = constructors.indexOf(Class)
  if (~i) registry[i] = item
  return item
}

module.exports = function internals(Class) {
  if (~constructors.indexOf(Class)) {
    return Class
  }

  constructors.push(Class)
  var localStatics = setRegistryItem(Class, statics, {})
  var localSetups = setRegistryItem(Class, setups, [])
  var localInclusions = setRegistryItem(Class, inclusions, [])
  var localAugmentations = setRegistryItem(Class, augmentations, [])

  var prototype = Class.prototype

  // Constructor Management

  /**
   * For setting up static functions, specially functions that access a closure.
   * It's useful when inheriting from a class where a static function is accessing a closure.
   * This way those closures are always re-defined for the super class, when calling the  provided setup function.
   *
   * @param {Function} fn the setup function.
   *                      it will receive the current Class as first argument, and the Base (its parent) as second
   * @param {Function} [Base] this argument is managed internally
   * @return {Function} Class
   * */
  Class.setup = function (fn, Base) {
    fn(Class, Base)
    localSetups.push(fn)
    return Class
  }

  /**
   * For defining static functions that doesn't need a closure.
   *
   * @param {String} name
   * @param {Function} fn
   * @return {*} Class
   * */
  Class.static = function (name, fn) {
    localStatics[name] = fn
    object.method(Class, name, fn)
    return Class
  }

  /**
   * Extends Class with Super and returns Super.
   *
   * @param {Function} Super the super class
   * @return {Function} Super
   * */
  Class.extend = function (Super) {
    internals(Super)
    Super.inherit(Class)
    return Super
  }

  /**
   * Sets the Class' prototype to Base, inheriting from it.
   * Sets up the prototype chain correctly.
   * If Base is another managed constructor,
   * inherits the other managed properties like initializers, statics, setups.
   *
   * @param {Function} Base the base class to inherit from
   * @return {Function} Class
   * */
  Class.inherit = function (Base) {
    prototype = Class.prototype = Object.create(Base.prototype)
    Class.prototype.constructor = Class

    if (~constructors.indexOf(Base)) {
      getRegistryItem(Base, setups).forEach(function (setup) { Class.setup(setup, Base) })
      getRegistryItem(Base, augmentations).forEach(function (extension) {
         if (!~localAugmentations.indexOf(extension)) {
           localAugmentations.push(extension)
         }
      })
      getRegistryItem(Base, inclusions).forEach(function (inclusion) {
         if (!~localInclusions.indexOf(inclusion)) {
           localInclusions.push(inclusion)
         }
      })
      object.in(getRegistryItem(Base, statics), function (name, fn) { Class.static(name, fn) })
    }

    return Class
  }

  /**
   * Expands the Class' prototype with the Other's, copying methods and properties from it.
   * Adds the Other constructor as an onCreate callback.
   *
   * @param {Function|Function[]} Other Can be an array of constructors.
   * @return {Function} Class
   * */
  Class.include = function (Other) {
    function include( Other ){
      if ( typeof Other == "function" && !Class.includes(Other)) {
        Class.proto(Other.prototype)
        localInclusions.push(Other)
      }
    }
    if (Array.isArray(Other) ){
      Other.forEach(include)
    }
    else {
      include(Other)
    }
    return Class
  }

  /**
   * Checks if this class includes another
   *
   * @param {Function} Other
   * @return {Boolean}
   * */
  Class.includes = function (Other) {
    return !!~localInclusions.indexOf(Other)
  }

  /**
   * Calls an extension function (or an array of functions) in the context of the Class's prototype.
   * Meaning the `this` value will be the prototype, also, the first argument is the Class constructor itself.
   * This method enables functional mixins.
   *
   * @param {Function|Function[]} extensions
   * @return {Function} Class
   * */
  Class.augment = function (extensions) {
    function augment(extension) {
      if (typeof extension == "function" && !Class.augments(extension))
        extension.call(Class.prototype, Class)
      localAugmentations.push(extension)
    }
    if (Array.isArray(extensions))
      extensions.forEach(augment)
    else
      augment(extensions)
    return Class
  }

  /**
   * Checks if this extension augments this class
   *
   * @param {Function} extension
   * @return {Boolean}
   * */
  Class.augments = function (extension) {
    return !!~localAugmentations.indexOf(extension)
  }

  // Prototype Management

  /**
   * Registers a method on the Class's prototype.
   * Methods are writable, not-enumerable, not-configurable functions.
   *
   * @param {String} name the property name of the method.
   * @param {Function} fn
   * @return {Function} Class
   * */
  Class.method = function (name, fn) {
    object.writable.method(prototype, name, fn)
    return Class
  }

  /**
   * Registers a property on the prototype.
   * Properties are writable not-enumerable, not-configurable values.
   *
   * @param {String} name
   * @param {Function} fn
   * @return {Function} Class
   * */
  Class.property = function (name, fn) {
    object.writable.property(prototype, name, fn)
    return Class
  }

  /**
   * Registers a getter on the prototype.
   * Getters are not-writable, not-enumerable, not-configurable functions.
   *
   * @param {String} name
   * @param {Function} fn
   * @return {Function} Class
   * */
  Class.get = function (name, fn) {
    object.getter(prototype, name, fn)
    return Class
  }

  /**
   * Registers a setter on the prototype.
   * Setters are not-writable, not-enumerable, not-configurable functions.
   *
   * @param {String} name
   * @param {Function} fn
   * @return {Function} Class
   * */
  Class.set = function (name, fn) {
    object.setter(prototype, name, fn)
    return Class
  }

  /**
   * Registers an accessor (a getter and a setter) on the prototype.
   * Accessors are not-writable, not-enumerable, not-configurable functions.
   *
   * @param {String} name
   * @param {Function} getter
   * @param {Function} setter
   * @return {Function} Class
   * */
  Class.accessor = function (name, getter, setter) {
    object.accessor(prototype, name, getter, setter)
    return Class
  }

  /**
   * Expands the prototype with an object.
   * The values will be registered on the prototype with the exact same descriptors.
   *
   * @param {Object} prototype
   * @return {Function} Class
   * */
  Class.proto = function (prototype) {
    Object.getOwnPropertyNames(prototype).forEach(function (name) {
      if (name !== "constructor" ) {
        var descriptor = Object.getOwnPropertyDescriptor(prototype, name)
        Object.defineProperty(Class.prototype, name, descriptor)
      }
    })
    return Class
  }

  return Class
}
