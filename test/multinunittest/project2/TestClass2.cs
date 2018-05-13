using System;
using NUnit.Framework;
using Shouldly;

namespace NunitTests2
{
    public class TestClass4
    {
        [Test]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [Test]
        public void Pass2()
        {
            (1+1).ShouldBe(2);
        }

        [Test]
        public void Fail()
        {
            (1+1).ShouldBe(3);
        }   

        [Test]
        [Ignore("Skipped")]
        public void SkippedTest()
        {
            (1+1).ShouldBe(3);
        }             
    }
}
