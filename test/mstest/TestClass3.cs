using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Shouldly;

namespace VSCodeDotnetTestExplorer.Testing.ObjectUnderTest.MSTests
{
    [TestClass]
    public class TestClass3
    {
        [TestMethod]
        public void Pass()
        {
            string expected = "expected";
            var tested = new Tested();
            var actual = tested.ReturnString(expected);

            (actual).ShouldBe(expected);
        }

    }
}
