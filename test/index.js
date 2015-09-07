var chai = require("chai")
var assert = chai.assert
var internals = require("../index")

function testIt (desc, test) {
  var args = []
  var i = -1
  while (++i < test.length) {
    args.push(function Class() {})
  }
  it(desc, function () {
    test.apply(this, args)
  })
}

function createMixin () {
  function testMethod () {}

  function mixin () {
    this.testMethod = testMethod
  }
  mixin.testMethod = testMethod

  return mixin
}

function applyTestPrototype (Class) {
  Class.prototype.testMethod = function () {}
  return Class
}

describe("internals", function () {

  testIt("returns the same constructor", function (Class) {
    assert.equal(Class, internals(Class))
  })

  testIt("supers are instance of base class", function (A, B) {
    internals(A)
    A.extend(B)
    var b = new B()
    assert.instanceOf(b, A)
  })

  testIt("supers are instance of super class", function (A, B) {
    internals(A)
    A.extend(B)
    var b = new B()
    assert.instanceOf(b, B)
  })

  testIt("constructors inherit static methods", function (A, B) {
    function staticMethod() {}
    internals(A)
    A.static("staticMethod", staticMethod)
    A.extend(B)
    assert.equal(A.staticMethod, B.staticMethod)
  })

  testIt("supers include prototype methods", function (A, B) {
    applyTestPrototype(A)
    internals(A)
    A.extend(B)
    var a = new A()
    var b = new B()
    assert.equal(a.testMethod, b.testMethod)
  })

  testIt("calls base constructor(s)", function () {
    function A() {
      called = true
    }
    function B () {}
    internals(B)
    B.include(A)
    var called = false
    var b = new B()
    B.create(b)
    assert.isTrue(called)
  })

  testIt("augments with functional mixins", function (A) {
    internals(A)
    var mixin = createMixin()
    A.augment(mixin)
    var a = new A()
    assert.equal(a.testMethod, mixin.testMethod)
  })

  testIt("calls onCreate callbacks", function (A) {
    internals(A)
    var called = false
    A.onCreate(function () {
      called = true
    })
    var a = new A()
    A.create(a)
    assert.isTrue(called)
  })

  testIt("creates a setup", function () {
    function A () {}
    function B () {}
    function C () {}

    internals(A)

    A.setup(function (Class, Base) {
      var something = []

      if (Base && Base.something) {
        something = something.concat(Base.something)
      }
      Class.something = something

      Class.doSomething = function (someValue) {
        something.push(someValue)
      }

      Class.printSomething = function () {
        return something.join(" ")
      }
    })

    assert.isFunction(A.doSomething)
    A.doSomething("hey")
    A.extend(B)
    assert.isFunction(B.doSomething)
    B.doSomething("ho")
    assert.equal(B.printSomething(), "hey ho")
    B.extend(C)
    assert.isFunction(C.doSomething)
    C.doSomething("let's go")
    assert.equal(C.printSomething(), "hey ho let's go")
  })

})
