using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Shouldly;

namespace MsTestTests { // Curly bracket on same line as namespace for testing namespace parsing

    [TestClass]
    public class TestClass1
    {
        [TestMethod]
        public void Pass()
        {
            (1 + 1).ShouldBe(2);
        }

        [TestMethod]
        public void AnotherPass()
        {
            (1 + 1).ShouldBe(2);
        }

        [TestMethod()]
        public void Fail()
        {
            (1 + 1).ShouldBe(22);
        }
        
        [TestMethod]
        [DataRow("First")]
        [DataRow("Second")]
        public void DataTest(string input)
        {
            (1 + 1).ShouldBe(2);
        }

    }
}
