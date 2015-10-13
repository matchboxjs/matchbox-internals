var chai = require("chai")
var assert = chai.assert
var internals = require("../index")

function testClass (desc, test) {
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

  testClass("returns the constructor passed", function (Class) {
    assert.equal(Class, internals(Class))
  })

  testClass("returns the same constructor when called twice", function (Class) {
    internals(Class)
    assert.equal(Class, internals(Class))
    assert.equal(internals(Class), internals(Class))
  })

  describe(".setup()", function () {

    testClass("registers a setup", function (Class) {
      internals(Class)
      function setup () {}
      Class.setup(setup)
    })

    testClass("runs the setup on registration", function (Class) {
      var called = false
      internals(Class)
      function setup () {
        called = true
      }
      Class.setup(setup)
      assert.isTrue(called)
    })

    testClass("setup receives current class as first argument", function (Class) {
      internals(Class)
      function setup (arg1) {
        assert.equal(arg1, Class)
      }
      Class.setup(setup)
    })
  })
  describe(".static()", function () {

    testClass("registers a static method", function (Class) {
      internals(Class)
      function staticMethod () {}
      Class.static("staticMethod", staticMethod)
    })

    testClass("assigns a static method to the constructor", function (Class) {
      internals(Class)
      function staticMethod () {}
      Class.static("staticMethod", staticMethod)
      assert.equal(Class.staticMethod, staticMethod)
    })
  })
  describe(".extend()", function () {

    testClass("supers are instance of base class", function (A, B) {
      internals(A)
      A.extend(B)
      var b = new B()
      assert.instanceOf(b, A)
    })

    testClass("supers are instance of super class", function (A, B) {
      internals(A)
      A.extend(B)
      var b = new B()
      assert.instanceOf(b, B)
    })

    testClass("supers include prototype methods", function (A, B) {
      applyTestPrototype(A)
      internals(A)
      A.extend(B)
      var a = new A()
      var b = new B()
      assert.equal(a.testMethod, b.testMethod)
    })

    testClass("constructors inherit static methods", function (A, B) {
      function staticMethod() {}
      internals(A)
      A.static("staticMethod", staticMethod)
      A.extend(B)
      assert.equal(A.staticMethod, B.staticMethod)
    })
  })
  describe(".inherit()", function () {

    describe("setups", function () {

      testClass("inherited setups are executed", function (Base, Super) {
        var called = false
        function setup () {
          called = true
        }
        internals(Base)
        Base.setup(setup)
        // reset test value
        called = false
        Base.extend(Super)
        assert.isTrue(called)
      })

      testClass("inherited setups receive Base constructor as second argument", function (Base, Super) {
        var extending = false
        function setup (arg1, arg2) {
          if (extending) {
            assert.equal(arg1, Super)
            assert.equal(arg2, Base)
          }
        }
        internals(Base)
        Base.setup(setup)
        extending = true
        Base.extend(Super)
      })

      testClass("setups can carry data", function () {
        function A () {}
        function B () {}
        function C () {}

        internals(A)

        A.setup(function (Class, Base) {
          var data = []

          if (Base && Base.setupData) {
            data = data.concat(Base.setupData)
          }
          Class.setupData = data

          Class.addData = function (someValue) {
            data.push(someValue)
          }

          Class.printData = function () {
            return data.join(" ")
          }
        })

        assert.isFunction(A.addData)
        A.addData("hey")
        A.extend(B)
        assert.isFunction(B.addData)
        B.addData("ho")
        assert.equal(B.printData(), "hey ho")
        B.extend(C)
        assert.isFunction(C.addData)
        C.addData("let's go")
        assert.equal(C.printData(), "hey ho let's go")
      })
    })
  })
  describe(".include()", function () {

    testClass("can check includes", function (A, B) {
      internals(A)
      A.include(B)
      assert.isTrue(A.includes(B))
    })
    testClass("can check inherited includes", function (A, B, C) {
      internals(A)
      A.include(B)
      internals(C)
      C.inherit(A)
      assert.isTrue(C.includes(B))
    })
  })
  describe(".augment()", function () {

    testClass("augments with functional mixins", function (A) {
      internals(A)
      var mixin = createMixin()
      A.augment(mixin)
      var a = new A()
      assert.equal(a.testMethod, mixin.testMethod)
      assert.isTrue(A.augments(mixin))
    })
  })

  describe(".method()", function () {})
  describe(".property()", function () {})
  describe(".get()", function () {})
  describe(".set()", function () {})
  describe(".accessor()", function () {})
  describe(".proto()", function () {

    testClass("included managed prototypes work", function (Base, Super) {
      function testMethod () {}
      internals(Base)
      Base.proto({
        testMethod: testMethod
      })
      internals(Super)
      Super.include(Base)
      assert.equal(Super.prototype.testMethod, testMethod)
    })

    testClass("inherits methods", function (Base, Super) {
      function testMethod () {}
      internals(Base)
      Base.proto({
        testMethod: testMethod
      })
      internals(Super)
      Super.inherit(Base)
      assert.equal(Super.prototype.testMethod, testMethod)
    })
  })
})
