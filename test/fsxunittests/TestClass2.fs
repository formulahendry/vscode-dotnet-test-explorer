module VSCodeDotnetTestExplorer.Testing.ObjectUnderTest.FSharpTests

open Xunit
open Shouldly
open VSCodeDotnetTestExplorer.Testing.ObjectUnderTest

[<Fact>]
let ``This should pass`` () =
    let expected = "expected"
    let tested = new Tested()
    let actual = (tested.ReturnString(expected))
    (expected).ShouldBe(actual)
