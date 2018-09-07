using System;
using NUnit.Framework;
using Shouldly;

namespace NunitTests
{
    [TestFixture]
    public class SingleTestFixture
    {
        [Test]
        public void Pass()
        {
            (1 + 1).ShouldBe(2);
        }

        [Test]
        public void AnotherPass()
        {
            (1 + 1).ShouldBe(2);
        }

        [Test]
        public void Fail()
        {
            (1 + 1).ShouldBe(2);
        }
        [TestCase]
        public void SingleTestCaseAtribute()
        {
            (1 + 1).ShouldBe(2);
        }
        [TestCase("First")]
        [TestCase("Second")]
        public void MultipleTestCaseAtributes(string number)
        {
            (1 + 1).ShouldBe(2);
        }

    }
}
