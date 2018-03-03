using System;
using Shouldly;
using Xunit;

namespace XunitTests
{

    public class TestClass1
    {
        [Fact]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [Fact]
        public void AnotherPass()
        {
            (1+1).ShouldBe(2);
        }

        [Fact]
        public void Fail()
        {
            (1+1).ShouldBe(2);
        }        
    }
}
