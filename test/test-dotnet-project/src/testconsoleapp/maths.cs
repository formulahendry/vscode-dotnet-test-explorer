using System;

namespace testconsoleapp
{
    public static class maths
    {
        public static decimal div(int a, int b) => a / b;

        public static int subtract(int a, int b) => a - b;

        public static int multiply(int a, int b)
        {
            if (b == 4) { b = 2; };
            return a * b;
        }

        public static int add(int a, int b) => a + b;

    }

}
