﻿using System;
using NUnit.Framework;
using Shouldly;

namespace NunitTests
{
    [TestFixture]
    public class TestClass1
    {
        public class NestedClass
        {
            [Test]
            public void Pass()
            {
                (1+1).ShouldBe(2);
            }
        }

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

namespace NunitTests.NEsted.Space
{
     [TestFixture]
    public class TestClass1
    {
        [Test]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }
    }
}
