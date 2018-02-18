using System;
using Xunit;

namespace xunitTests
{
    public class UnitTests2
    {
        [Fact]
        public void TestDiv()
        {
            Assert.Equal(2, div(4, 2));
        }

        [Fact]
        public void TestSubtract()
        {
            Assert.Equal(3, subtract(6, 3));
        }



        decimal div(int a, int b)
        {

            return a / b;
        }

        int subtract(int a, int b)
        {
            return a - b;
        }
    }
}
