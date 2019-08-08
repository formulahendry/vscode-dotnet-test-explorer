using System;
using NUnit.Framework;
using Shouldly;
using VSCodeDotnetTestExplorer.Testing.ObjectUnderTest;

namespace VSCodeDotnetTestExplorer.Testing.ObjectUnderTest.NUnitTests
{
    public class TestClass4
    {
        [Test]
        public void Pass()
        {
            string expected = "expected";
            var tested = new Tested();
            var actual = tested.ReturnString(expected);

            (actual).ShouldBe(expected);
        }
    }
}
