using System;
using Shouldly;
using Xunit;

namespace XunitTests
{
    public class TestClass2
    {
        private string zzz;

        public TestClass2()
        {
               
        }

        [Fact]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [Fact]
        public void Pass2()
        {
            (1+1).ShouldBe(2);
        }

        [Fact]
        public void Fail()
        {
            (1+1).ShouldBe(3);
        }   

        [Fact(Skip = "skipped")]
        public void SkippedTest()
        {
            (1+1).ShouldBe(3);
        }             
    }
}
