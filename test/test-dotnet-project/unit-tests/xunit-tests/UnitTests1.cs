using System;
using Xunit;
using testconsoleapp;

namespace xunitTests
{
    public class UnitTests1
    {
        [Fact]
        public void TestAdd()
        {
            Assert.Equal(5, maths.add(2, 3));
        }

        [Fact]
        public void TestMultiply()
        {
            Assert.Equal(9, maths.multiply(3, 3));
        }

        [Fact]
        public void TestMultiplyInvalid()
        {
            Assert.Equal(12, maths.multiply(3, 4));
        }


    }
}
