using Xunit;

namespace XunitTests
{
    public class TestClass4
    {
        [Theory]
        [InlineData(")")]
        public void ClosedParenthesisTest(string str)
        {
            Assert.True(true);
        }

        [Theory]
        [InlineData("{}[]Aa1")]
        public void NoParenthesisTest(string str)
        {
            Assert.True(true);
        }

        [Theory]
        [InlineData("(")]
        public void ErrorOpenParenthesisTest(string str)
        {
            Assert.True(true);
        }

        [Theory]
        [InlineData(")A")]
        public void ErrorClosedParenthesisWithChar(string str)
        {
            Assert.True(true);
        }
    }
}
