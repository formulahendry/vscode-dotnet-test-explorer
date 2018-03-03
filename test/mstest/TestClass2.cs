using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Shouldly;

namespace MsTestTests
{
    [TestClass]
    public class TestClass2
    {
        [TestMethod]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [TestMethod]
        public void Pass2()
        {
            (1+1).ShouldBe(2);
        }

        [TestMethod]
        public void Fail()
        {
            (1+1).ShouldBe(3);
        }   

        [TestMethod]
        [Ignore]
        public void SkippedTest()
        {
            (1+1).ShouldBe(3);
        }             
    }
}
