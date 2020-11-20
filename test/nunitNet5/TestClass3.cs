using System;
using NUnit.Framework;
using Shouldly;

namespace NunitTests
{
    [TestFixture("First")]
    [TestFixture("second")]
    public class TestClass3
    {
        public TestClass3(string input)
        {

        }
        [Test]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [TestCase]
        public void OneTime()
        {
            (1+1).ShouldBe(2);
        }

        [TestCase("First")]
        [TestCase("Second")]
        public void TwoTimes(string input)
        {
            (1+1).ShouldBe(2);
        }   
          
    }
}
