using System;
using NUnit.Framework;
using Shouldly;

namespace NunitTests
{
    [TestFixture("First")]
    [TestFixture("Second")]
    public class MultipleTestFixtures
    {
        public MultipleTestFixtures(string x)
        {
        }

        [Test]
        public void Pass()
        {
            (1 + 1).ShouldBe(2);
        }

        [Test]
        public void Pass2()
        {
            (1 + 1).ShouldBe(2);
        }

        [Test]
        public void Fail()
        {
            (1 + 1).ShouldBe(3);
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
        [Test]
        [Ignore("Skipped")]
        public void SkippedTest()
        {
            (1 + 1).ShouldBe(3);
        }
    }
}
