import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

public class NumberProcessorTest {

    @Test
    public void testStatementCoverage() {
        NumberProcessor processor = new NumberProcessor();
      
        assertEquals(2, processor.sumEvenNumbers(2)); 
    }
}
    @Test
    public void testPathCoverage_NoLoop() {
        NumberProcessor processor = new NumberProcessor();
        // Đường đi 1: n = 0 -> Không thỏa mãn điều kiện, bỏ qua toàn bộ vòng lặp for
        assertEquals(0, processor.sumEvenNumbers(0)); 
    }

    @Test
    public void testPathCoverage_LoopButNoIf() {
        NumberProcessor processor = new NumberProcessor();
        // Đường đi 2: n = 1 -> Vào for 1 lần, nhưng i=1 nên bỏ qua if (1 % 2 != 0)
        assertEquals(0, processor.sumEvenNumbers(1)); 
    }

    @Test
    public void testPathCoverage_LoopAndIf() {
        NumberProcessor processor = new NumberProcessor();
        // Đường đi 3: n = 2 -> Vào for, có lúc vào nhánh if (khi i=2)
        assertEquals(2, processor.sumEvenNumbers(2)); 
    }
