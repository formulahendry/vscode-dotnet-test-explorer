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
        [InlineData(3)]
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

        [Theory]
        [InlineData("Häj")]
        public void WithSpecialChars(string value)
        {
            (value).ShouldBe("Häjx");
        }

        [Theory]
        [InlineData("With.Dot", 5.5)]
        public void WithDot(string value, decimal value2)
        {
            (value).ShouldBe("With.Dot");
            value2.ShouldBe(5.5m);
        }
        
    }
}
