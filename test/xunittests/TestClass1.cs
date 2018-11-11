using System;
using Shouldly;
using Xunit;

namespace XunitTests
{
    public class TestClass1
    {
        [Fact]
        public void Pass()
        {
            (1+1).ShouldBe(2);
        }

        [Fact]
        public void PassNew()
        {
            (1+1).ShouldBe(2);
        }        

        [Fact]
        public void AnotherPass()
        {
            (1+1).ShouldBe(2);
        }

        [Fact]
        public void Fail()
        {
            (1+new InnerC().Get()).ShouldBe(3);
        }      

        [Fact]
        public void Fail2()
        {
            (1+new InnerC().Get()).ShouldBe(3);
        }  

                [Fact]
        public void Fail3()
        {
            (1+1).ShouldBe(3);
        }    
    }

    public class InnerC
    {
        public int Get() {
            throw new Exception("");
            return 3;
        }
    }
}
