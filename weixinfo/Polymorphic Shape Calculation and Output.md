# Polymorphic Shape Calculation and Output

**Created:** 4/30/2025, 11:18:05 AM
**Updated:** 4/30/2025, 11:18:32 AM
**Exported:** 6/13/2026, 4:05:29 AM
**Link:** [https://chat.deepseek.com/a/chat/s/5fdb13cc-5cf4-4799-b4ca-fa1f24ea1743](https://chat.deepseek.com/a/chat/s/5fdb13cc-5cf4-4799-b4ca-fa1f24ea1743)

---

## User
**2025-04-30T16:18:05.616Z**

The following program does not present polymorphism behavior. The output is:

area of unknown is 0
area of Rectangle is 0
area of Rectangle_3D is 0

Modify the base class Shape and the main so that it runs polymorphically and output is like:

area of unknown is 0
area of Rectangle is 200
volume of Rectangle_3D is 1000.

You could replace some lines with your own lines of code that are needed Note, you don't have to use a compiler, but you could if you need.

Here is the code:

## DeepSeek
**2025-04-30T16:18:05.616Z**

To achieve polymorphic behavior, we need to make the `Calc()` and `Output()` methods virtual in the base class `Shape`. Additionally, we need to use pointers or references to the base class in the array to enable dynamic binding. Here's the modified code:

```cpp
#include <iostream>
using namespace std;

class Shape {
protected:
    string name;
    int d;
public:
    Shape(string _name, int _d) : name(_name), d(_d) {}
    virtual double Calc() { return 0; }
    virtual void Output() { cout << "area of " << name << " is " << Calc() << endl; }
    virtual ~Shape() {} // Virtual destructor for proper cleanup
};

class Rectangle : public Shape {
private:
    int d2;
public:
    Rectangle(string _name, int _d1, int _d2) : Shape(_name, _d1), d2(_d2) {}
    double Calc() override { return Shape::d * d2; }
    void Output() override { cout << "area of " << name << " is " << Calc() << endl; }
};

class Rectangle_3D : public Rectangle {
private:
    int d3;
public:
    Rectangle_3D(string _name, int _d1, int _d2, int _d3) : Rectangle(_name, _d1, _d2), d3(_d3) {}
    double Calc() override { return Rectangle::Calc() * d3; }
    void Output() override { cout << "volume of " << name << " is " << Calc() << endl; }
};

int main() {
    Shape* shapes[3] = { 
        new Shape("unknown", 0), 
        new Rectangle("Rectangle", 10, 20), 
        new Rectangle_3D("Rectangle_3D", 10, 20, 5) 
    };
    
    for (Shape* shape : shapes) {
        shape->Output();
        delete shape; // Clean up
    }
    
    return 0;
}
```

Key changes made:
1. Made `Calc()` and `Output()` virtual in the `Shape` class
2. Added a virtual destructor to `Shape` for proper cleanup
3. Changed the array to store pointers to `Shape` objects
4. Used `new` to create objects on the heap
5. Changed the loop to use pointer syntax (`->` instead of `.`)
6. Added proper cleanup with `delete`

This will now produce the expected output:
```
area of unknown is 0
area of Rectangle is 200
volume of Rectangle_3D is 1000
```

