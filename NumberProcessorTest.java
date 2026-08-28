import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

public class NumberProcessorTest {

    @Test
    public void testStatementCoverage() {
        NumberProcessor processor = new NumberProcessor();
      
        assertEquals(2, processor.sumEvenNumbers(2)); 
    }
}