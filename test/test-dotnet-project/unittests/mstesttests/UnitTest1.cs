using Microsoft.VisualStudio.TestTools.UnitTesting;
using testconsoleapp;
namespace mstesttests
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestAdd()
        {
            Assert.Equals(5, maths.add(2, 3));
        }
    }
}
