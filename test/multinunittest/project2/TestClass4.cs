using System;
using NUnit.Framework;
using Shouldly;

namespace NunitTests2
{

    public class TestClass3
    {
        [Test]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [Test]
        public void AnotherPass()
        {
            (1+1).ShouldBe(2);
        }

        [Test]
        public void Fail()
        {
            (1+1).ShouldBe(3);
        }        
    }
}
