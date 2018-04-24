using System;
using Shouldly;
using Xunit;

namespace XunitTests
{
    public class TestClass3
    {
        public static TheoryData<int> DataSet = new TheoryData<int> {
            { 2 }
        };

        [Theory]
        [InlineData(2)]
        public void Pass(int value)
        {
            (value).ShouldBe(2);
        }

        [Theory]
        [MemberData(nameof(DataSet))]
        public void Pass2(int value)
        {
            (1+1).ShouldBe(value);
        }

        [Theory]
        [InlineData(2)]
        public void Fail(int value)
        {
            (value).ShouldBe(3);
        }   

        [Theory(Skip = "skipped")]
        [InlineData(2)]
        public void SkippedTest(int value)
        {
            (value).ShouldBe(3);
        }             
    }
}
