public class NumberProcessor {

    // Phương thức chứa vòng lặp và lệnh rẽ nhánh
    public int sumEvenNumbers(int n) {
        int sum = 0;
        
        // Vòng lặp
        for (int i = 1; i <= n; i++) { 
            // Lệnh rẽ nhánh
            if (i % 2 == 0) {          
                sum += i;
            }
        }
        
        return sum;
    }

    public static void main(String[] args) {
        NumberProcessor processor = new NumberProcessor();
        int result = processor.sumEvenNumbers(5);
        System.out.println("Tổng các số chẵn từ 1 đến 5 là: " + result);
    }
}