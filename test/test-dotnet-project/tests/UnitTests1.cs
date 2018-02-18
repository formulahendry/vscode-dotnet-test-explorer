using System;
using Xunit;

namespace xunitTests
{
    public class UnitTests1
    {
        [Fact]
        public void TestAdd()
        {
            Assert.Equal(5, add(2, 3));
        }

        [Fact]
        public void TestMultiply()
        {
            Assert.Equal(9, multiply(3, 3));
        }

        [Fact]
        public void TestMultiplyInvalid()
        {
            Assert.Equal(12, multiply(3, 4));
        }

        int multiply(int a, int b)
        {
            if (b == 4) { b = 2; };
            return a * b;
        }

        int add(int a, int b)
        {
            return a + b;
        }
    }
}
