using System;
using Xunit;

namespace tests
{
    public class UnitTest1
    {
        [Fact]
        public void Test1()
        {
            Assert.Equal(5, add(2, 3));
        }

        int add(int a, int b)
        {
            return a + b;
        }
    }
}
