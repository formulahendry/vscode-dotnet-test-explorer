using System;
using Shouldly;
using Xunit;
using VSCodeDotnetTestExplorer.Testing.ObjectUnderTest;

namespace VSCodeDotnetTestExplorer.Testing.ObjectUnderTest.XUnitTests
{
    public class TestClass5
    {
        [Fact]
        public void Pass()
        {
            string expected = "expected";
            var tested = new Tested();
            var actual = tested.ReturnString(expected);

            (actual).ShouldBe(expected);
        }

        [Fact]
        public void Pass2()
        {
            int expected = 1;
            var tested = new Tested();
            var actual = tested.ReturnInt(expected);

            (actual).ShouldBe(expected);
        }

        [Fact(DisplayName="VSCodeDotnetTestExplorer.Testing.ObjectUnderTest.XUnitTests.TestClass5.xUnit Test with a (.) different DisplayName in a different namespace")]
        public void PassWithDisplayName()
        {
            var expected = "DisplayName";
            var tested = new Tested();
            var actual = tested.ReturnString(expected);

            (actual).ShouldBe(expected);
        }

        [Theory]
        [InlineData(2)]
        [InlineData(3)]
        public void PassTheory(int value)
        {
            var tested = new Tested();
            var actual = tested.ReturnInt(value);

            (actual).ShouldBe(value);
        }

    }
}
