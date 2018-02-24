using System;
using Xunit;
using testconsoleapp;

namespace xunitTests
{
    public class UnitTests2
    {
        [Fact]
        public void TestDiv()
        {
            Assert.Equal(2, maths.div(4, 2));
        }

        [Fact]
        public void TestSubtract()
        {
            Assert.Equal(3, maths.subtract(6, 3));
        }




    }
}
